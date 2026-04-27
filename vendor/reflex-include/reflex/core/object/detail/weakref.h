#pragma once

#include "../traits.h"
#include "../tref.h"
#include "../functions/null.h"
#include "../../list.h"
#include "../../string/hash.h"




//
//Detail

namespace Reflex::Detail
{

	class GenericWeakRefImpl;


	template <class TYPE> class WeakRef;

	template <class TYPE> using ConstWeakRef = WeakRef <const TYPE>;

}




//
//Detail::GenericWeakRefImpl 

class Reflex::Detail::GenericWeakRefImpl : public Item <GenericWeakRefImpl,false>
{
public:

	REFLEX_NONCOPYABLE(GenericWeakRefImpl);

	static constexpr UInt32 kWeakReferences = K32("WeakReferences");

	struct List;


	bool Compare(const Object * adr) const { return m_target == adr; }	//fast compare on cached adr, object may have died



protected:

	GenericWeakRefImpl(DynamicTypeRef object_t, Object & null, Object & init_target);

	void Clear();

	bool Store(Object & target);

	Object & Load() const;



private:

	friend Item;

	void OnDetach(Item::List & list);


	const DynamicTypeRef m_object_t;

	Object * const m_null;

	Object * m_target;
};




//
//WeakRef

template <class TYPE>
class Reflex::Detail::WeakRef : public Detail::GenericWeakRefImpl
{
public:

	using Base = Detail::GenericWeakRefImpl;

	REFLEX_STATIC_ASSERT(kIsNullable<NonConstT<TYPE>>);

	
	WeakRef() : Base(TYPE::kDynamicTypeInfo, GetNullInstance<NonConstT<TYPE>>(), GetNullInstance<NonConstT<TYPE>>()) {}

	WeakRef(TYPE & target) : Base(TYPE::kDynamicTypeInfo, GetNullInstance<NonConstT<TYPE>>(), target) {}

	WeakRef(const WeakRef & weakref) = delete;

	WeakRef(WeakRef && weakref) = delete;


	using Base::Clear;

	bool Store(TYPE & ref) { return Base::Store(RemoveConst(ref)); }

	TRef <TYPE> Load() const { return Cast<TYPE>(Base::Load()); }


	WeakRef & operator=(const WeakRef & weakref) = delete;

	WeakRef & operator=(WeakRef && weakref) = delete;

};




//
//impl

struct Reflex::Detail::GenericWeakRefImpl::List :
	public Object,
	public Item <GenericWeakRefImpl, false>::List
{
	List(Object * owner)
		: owner(owner)
	{
	}

	using Item <GenericWeakRefImpl,false>::List::Clear;

	const Object * owner;
};
